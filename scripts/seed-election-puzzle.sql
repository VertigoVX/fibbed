-- Election Day puzzle: puzzle_number 3 = 4 November 2026
-- Run this in Supabase → SQL Editor to insert and approve it immediately.
-- The approve_draft() function auto-assigns the next puzzle_number.
-- If puzzle #3 is the target, run this before puzzles 1 and 2 are approved,
-- or adjust by calling approve_draft() three times if needed.
-- Alternatively, after approval, set the puzzle_number manually:
--   update puzzle_drafts set puzzle_number = 3 where id = '<id>';

do $$
declare
  draft_id uuid;
  assigned integer;
  rounds jsonb := '[
    {
      "theme": "Voting in South Africa",
      "level": "easy",
      "truths": [
        {
          "text": "South Africa'\''s voting stations open at 7am and close at 9pm on election day.",
          "source_url": "https://www.elections.org.za/content/About-Us/IEC-Events/Local-Government-Elections-2026/",
          "source_label": "IEC: Local Government Elections 2026"
        },
        {
          "text": "In a South African local government election, each voter receives two ballot papers: one for a ward candidate and one for a party list.",
          "source_url": "https://www.opencitieslab.org/how-your-vote-counts/",
          "source_label": "Open Cities Lab: How Your Vote Counts"
        },
        {
          "text": "South Africa'\''s first democratic elections, held in April 1994, saw Nelson Mandela become the country'\''s first Black president.",
          "source_url": "https://en.wikipedia.org/wiki/1994_South_African_general_election",
          "source_label": "Wikipedia: 1994 South African general election"
        }
      ],
      "fib": {
        "text": "South Africa uses electronic voting machines to count ballots at its polling stations.",
        "explanation": "South Africa has never used electronic voting — all ballots are physical paper, marked by hand and counted manually.",
        "source_url": "https://www.elections.org.za/content/About-Us/IEC-Events/Local-Government-Elections-2026/",
        "source_label": "IEC: Local Government Elections 2026"
      }
    },
    {
      "theme": "Local Government",
      "level": "medium",
      "truths": [
        {
          "text": "Ward councillors make up exactly half of a municipal council'\''s seats, with the remaining half filled through proportional representation.",
          "source_url": "https://www.opencitieslab.org/how-your-vote-counts/",
          "source_label": "Open Cities Lab: How Your Vote Counts"
        },
        {
          "text": "The ANC has won the largest share of council seats in every South African municipal election since 1994.",
          "source_url": "https://en.wikipedia.org/wiki/2026_South_African_municipal_elections",
          "source_label": "Wikipedia: 2026 South African municipal elections"
        },
        {
          "text": "South Africa has more than 4,000 wards, each of which directly elects its own councillor.",
          "source_url": "https://en.wikipedia.org/wiki/2021_South_African_municipal_elections",
          "source_label": "Wikipedia: 2021 South African municipal elections"
        }
      ],
      "fib": {
        "text": "Municipal elections in South Africa have typically recorded higher voter turnout than national elections.",
        "explanation": "The reverse is true: municipal elections have averaged below 50% turnout since 1994, while national elections typically exceed 80%.",
        "source_url": "https://etu.org.za/toolbox/docs/govern/elections.html",
        "source_label": "ETU: Elections in South Africa"
      }
    },
    {
      "theme": "The 2026 Elections",
      "level": "hard",
      "truths": [
        {
          "text": "More than 10,500 council seats are being contested in the 2026 local government elections.",
          "source_url": "https://en.wikipedia.org/wiki/2026_South_African_municipal_elections",
          "source_label": "Wikipedia: 2026 South African municipal elections"
        },
        {
          "text": "Around 29 million South Africans registered to vote in the 2026 local government elections.",
          "source_url": "https://www.sanews.gov.za/south-africa/ready-vote-preparing-2026-local-government-elections",
          "source_label": "SA News: Ready to Vote"
        },
        {
          "text": "The 2026 elections are the seventh local government election cycle in democratic South Africa.",
          "source_url": "https://en.wikipedia.org/wiki/2026_South_African_municipal_elections",
          "source_label": "Wikipedia: 2026 South African municipal elections"
        }
      ],
      "fib": {
        "text": "South African voter turnout in the 2026 local elections is forecast to be the highest ever recorded for a municipal election.",
        "explanation": "Polling predicted just 48.8% turnout in 2026 — a record low — down from 89.3% in 1999, continuing a long decline.",
        "source_url": "https://iol.co.za/pretoria-news/opinion/2026-09-11-low-turnout-coalition-politics-hover-over-2026-local-elections/",
        "source_label": "IOL: Low turnout, coalition politics hover over 2026 local elections"
      }
    }
  ]';
begin
  -- Insert the draft
  insert into public.puzzle_drafts (rounds, notes)
  values (rounds, 'Election Day special — 4 November 2026 SA local government elections')
  returning id into draft_id;

  -- Approve it (auto-assigns next puzzle_number)
  select public.approve_draft(draft_id) into assigned;

  -- Force it to puzzle_number 3 (= 4 November 2026, the third day since launch)
  update public.puzzle_drafts set puzzle_number = 3 where id = draft_id;

  raise notice 'Inserted and approved. Draft id: %, initially assigned number: %, forced to: 3', draft_id, assigned;
end;
$$;
