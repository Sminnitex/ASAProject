;; domain file: domain-deliveroo.pddl
(define (domain deliveroo)
    (:requirements :strips :typing)
    (:types
        tile
        agent
        parcel
    )
    (:predicates
        (delivery ?t - tile)
        (me ?a - agent)
        (at ?x - (either agent parcel) ?t - tile)
        (right ?t1 ?t2 - tile)
        (left ?t1 ?t2 - tile)
        (up ?t1 ?t2 - tile)
        (down ?t1 ?t2 - tile)
        (holding ?a - agent ?p - parcel)
    )
    
    ;; Action to move right
    (:action right
        :parameters (?me - agent ?from ?to - tile)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (right ?from ?to)
        )
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )

    ;; Action to move left
    (:action left
        :parameters (?me - agent ?from ?to - tile)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (left ?from ?to)
        )
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )

    ;; Action to move up
    (:action up
        :parameters (?me - agent ?from ?to - tile)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (up ?from ?to)
        )
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )

    ;; Action to move down
    (:action down
        :parameters (?me - agent ?from ?to - tile)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (down ?from ?to)
        )
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )

    ;; Action to deliver
    (:action deliver
        :parameters (?me - agent ?p - parcel ?t - tile)
        :precondition (and
            (at ?me ?t)
            (at ?p ?t)
        )
        :effect (and
            (delivery ?t)
            (not (at ?p ?t))  ; Assuming the parcel is considered delivered and removed from the tile
        )
    )

    ;; Action to pick-up
    (:action pick-up
        :parameters (?me - agent ?p - parcel ?t - tile)
        :precondition (and
            (at ?me ?t)
            (at ?p ?t)
        )
        :effect (and
            (holding ?me ?p) 
            (not (at ?p ?t))
        )
    )

    ;; Action to drop-off
    (:action drop-off
        :parameters (?me - agent ?p - parcel ?t - tile)
        :precondition (and
            (holding ?me ?p)
            (at ?me ?t)
        )
        :effect (and
            (at ?p ?t)
            (not (holding ?me ?p))
        )
    )

)
